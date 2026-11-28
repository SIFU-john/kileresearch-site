type Recommendation = { title: string; reason: string; pilot: string };

const scope: Recommendation = {
  title: 'Map one task before choosing a build',
  reason: 'A clear task, trusted inputs and a measurable outcome will make it easier to choose the right approach.',
  pilot: 'Map one real example with a team member. Identify the inputs, decisions, output and current baseline.',
};
const rag: Recommendation = {
  title: 'Retrieval-augmented generation (RAG)',
  reason: 'The system needs to find relevant business information at the time of answering.',
  pilot: 'Test common questions against one trusted collection and check answers against their sources.',
};

function recommendations(data: FormData): Recommendation[] {
  const goals = data.getAll('goal');
  const results = new Map<string, Recommendation>();
  const put = (recommendation: Recommendation) => results.set(recommendation.title, recommendation);

  if (goals.includes('knowledge')) {
    if (data.get('sources') === '2') put({
      title: 'Identify trusted sources before building RAG',
      reason: 'Retrieval depends on a reliable collection with clear ownership.',
      pilot: 'Collect approved documents for one topic and record who keeps them current.',
    });
    else {
      const access = data.get('access');
      const changes = data.get('changes');
      const details = [
        changes === '0' ? 'Test how quickly changes reach the search index.' : '',
        access === '0' || access === '2' ? 'Check that citations support each answer.' : '',
        access === '1' || access === '2' ? 'Test with people who have different access permissions.' : '',
      ].filter(Boolean).join(' ');
      put({ ...rag, pilot: [rag.pilot, details].filter(Boolean).join(' ') });
    }
  }

  if (goals.includes('task')) {
    if (data.get('process') === '2') put(scope);
    else if (data.get('process') === '1' && data.get('tools') === '2') put({
      title: 'Prototype a bounded agent',
      reason: 'The next step varies by case and the system needs to choose between tools or actions.',
      pilot: 'Test one scenario with a small set of permitted tools and require human approval for consequential actions.',
    });
    else put({
      title: 'Build a workflow',
      reason: 'The task can start with a defined sequence and a narrow set of tool actions.',
      pilot: data.get('approval') === '0' || data.getAll('requirement').includes('Human approval')
        ? 'Automate one repeatable step and have a person approve the output before it is used.'
        : 'Automate one repeatable step and compare the output with the current process.',
    });
  }

  if (goals.includes('model')) {
    const gap = data.get('gap');
    if (gap === '1') {
      if (!goals.includes('knowledge')) put(rag);
    } else if (gap === '2') put(scope);
    else if (data.get('prompt') === '0' && data.get('examples') === '0') put({
      title: 'Evaluate fine-tuning an existing model',
      reason: 'Prompt improvements have been tested, and you have examples and a way to score a stable task.',
      pilot: 'Compare a small fine-tune with the prompted baseline on a separate set of examples.',
    });
    else put({
      title: 'Improve prompts and evaluate first',
      reason: 'A prompt baseline and scored examples will show whether fine-tuning is worth the effort.',
      pilot: 'Write a clear prompt with examples and score its outputs on representative cases.',
    });
  }

  return results.size ? [...results.values()] : [scope];
}

const form = document.querySelector<HTMLFormElement>('[data-assessment]');
const result = document.querySelector<HTMLElement>('[data-result]');
if (form && result) {
  const steps = [...form.querySelectorAll<HTMLElement>('[data-step]')];
  const back = form.querySelector<HTMLButtonElement>('[data-back]')!;
  const next = form.querySelector<HTMLButtonElement>('[data-next]')!;
  const error = form.querySelector<HTMLElement>('[data-error]')!;
  const choices = [...form.querySelectorAll<HTMLInputElement>('input[name="goal"]')];
  const cards = result.querySelector<HTMLElement>('[data-recommendations]')!;
  const booking = result.querySelector<HTMLElement>('[data-booking]')!;
  let route = ['start', 'contact'];
  let index = 0;

  function showStep(focus = true) {
    const active = route[index];
    for (const step of steps) {
      step.hidden = step.dataset['step'] !== active;
      for (const field of step.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea')) {
        field.disabled = step.hidden;
      }
      if (!step.hidden && focus) step.querySelector('h2')?.focus();
    }
    error.hidden = true;
    back.hidden = index === 0;
    next.textContent = active === 'contact' ? 'See my assessment' : 'Continue';
  }

  form.noValidate = true;
  form.hidden = false;
  showStep(false);

  back.addEventListener('click', () => {
    index -= 1;
    showStep();
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (index === 0) {
      const selected = choices.filter(choice => choice.checked).map(choice => choice.value);
      if (!selected.length || selected.length > 2 || (selected.includes('unsure') && selected.length > 1)) {
        error.textContent = 'Choose one or two goals, or choose “I’m not sure yet” on its own.';
        error.hidden = false;
        choices[0]?.focus();
        return;
      }
      route = ['start', ...selected.filter(goal => goal !== 'unsure'), 'contact'];
    }
    if (index < route.length - 1) {
      index += 1;
      showStep();
      return;
    }

    // Only include fields on the current route. Draft data stays in the browser.
    for (const step of steps) {
      if (!route.includes(step.dataset['step'] ?? '')) continue;
      for (const field of step.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea')) field.disabled = false;
    }
    const data = new FormData(form!);
    const results = recommendations(data);
    cards.replaceChildren(...results.map(({ title, reason, pilot }, i) => {
      const card = document.createElement('article');
      const heading = document.createElement('h3');
      heading.textContent = results.length > 1 ? `${i === 0 ? 'Start with' : 'Then consider'} ${title.toLowerCase()}` : title;
      const why = document.createElement('p');
      why.textContent = reason;
      const nextStep = document.createElement('p');
      nextStep.textContent = pilot;
      card.append(heading, why, nextStep);
      return card;
    }));
    result.querySelector('[data-metric]')!.textContent = `Compare ${data.get('outcome')} with your current baseline.`;
    const requirements = data.getAll('requirement');
    result.querySelector('[data-requirements]')!.textContent = requirements.length ? `Plan for ${requirements.join(', ').toLowerCase()} before the pilot.` : '';
    booking.hidden = !data.has('discovery');
    form.hidden = true;
    result.hidden = false;
    result.querySelector('h2')?.focus();
  });

  result.querySelector('[data-restart]')?.addEventListener('click', () => {
    form.reset();
    route = ['start', 'contact'];
    index = 0;
    result.hidden = true;
    form.hidden = false;
    showStep();
  });
}
