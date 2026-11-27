// Consulting services (KILA-42 page-layouts §C). Names and ids are fixed; copy is final
// (KILA-44 site-copy v1). Ids are the anchors on /consulting and the values of the
// enquiry form's service <select>.
export interface Service {
  id: 'adoption' | 'private-llm' | 'cost' | 'security';
  name: string;
  problem: string;
  bestFor: string;
  bullets: { lead?: string; text: string }[];
}

export const services: Service[] = [
  {
    id: 'adoption',
    name: 'AI adoption assessment',
    problem: "Everyone says we should use AI, but we don't know where to start.",
    bestFor: 'Businesses that want to know where AI will genuinely help before spending money on it.',
    bullets: [
      { text: 'A look at how your team works today, and where the time goes' },
      { text: 'A shortlist of realistic uses for AI, ranked by effort and benefit' },
      { text: 'The risks to watch, including what data each use would touch' },
      { text: 'A plain-language report and a step-by-step plan' },
    ],
  },
  {
    id: 'private-llm',
    name: 'Local/private LLM deployment',
    problem: "We'd use AI, but we can't put customer data into a public chatbot.",
    bestFor: "Teams that want to use AI but can't send their data to public AI services.",
    bullets: [
      { text: 'Advice on the hardware and AI models that fit your needs and budget' },
      { text: 'Set-up on your own computers or your private cloud' },
      { text: 'Basic access controls and logging, so you can see who uses it' },
      { text: 'Clear documentation and training for your team' },
    ],
  },
  {
    id: 'cost',
    name: 'Inference cost optimisation',
    problem: 'Our AI bill goes up every month and nobody can tell us why.',
    bestFor: 'Businesses already using AI whose bills are growing or hard to predict.',
    bullets: [
      { text: 'A clear breakdown of where your AI spend goes' },
      { text: 'Ways to bring it down, such as smaller or compressed models, caching, or running models yourself' },
      { text: 'Before-and-after measurements taken from your own usage' },
      { text: 'A recommended setup, with the trade-offs explained' },
    ],
  },
  {
    id: 'security',
    name: 'AI Security Review',
    problem: 'Our staff use AI tools every day. Could they be leaking our data?',
    bestFor: 'Businesses that use AI tools, or have built AI features, and want to know where data could leak or be misused.',
    bullets: [
      { lead: 'Map your AI use:', text: 'the tools and features you use or have built, what data flows into them, and who has access' },
      { lead: 'Check the settings that leak data:', text: 'sharing, retention, model-training and access settings' },
      { lead: "Test the AI features you've built, with your written permission:", text: 'for example, hidden instructions that trick the AI (prompt injection), data leaking out in answers, unsafe handling of what the AI produces, and AI assistants with more access than they need' },
      { lead: 'Prioritised fixes:', text: 'a short report ranked by risk, plus a follow-up call' },
    ],
  },
];

export const serviceById = Object.fromEntries(services.map((s) => [s.id, s])) as Record<Service['id'], Service>;

/** Tag -> service, for the "Related service" link at the end of an article. First match wins. */
export const tagToService: Record<string, Service['id']> = {
  quantization: 'cost',
  benchmarking: 'cost',
  performance: 'cost',
  'cost': 'cost',
  'local-llm': 'private-llm',
  ollama: 'private-llm',
  'prompt-injection': 'security',
  security: 'security',
};
