// Consulting services (KILA-42 page-layouts §C). Names and ids are fixed; copy is placeholder
// for the Content & Brand Writer. Ids are the anchors on /consulting and the values of the
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
    problem: "We don't know where AI would actually help us.",
    bestFor: 'Businesses that want to know where AI genuinely helps before spending money.',
    bullets: [
      { text: 'A review of your current processes' },
      { text: 'A shortlist of realistic AI uses, ranked by effort and benefit' },
      { text: 'Risks and data considerations' },
      { text: 'A plain-language report and next-steps plan' },
    ],
  },
  {
    id: 'private-llm',
    name: 'Local/private LLM deployment',
    problem: "We can't send customer data to a public AI tool.",
    bestFor: "Teams that need AI but can't send data to public AI services.",
    bullets: [
      { text: 'Advice on hardware and models for your needs and budget' },
      { text: 'Set-up on your own machines or private cloud' },
      { text: 'Basic access controls and logging' },
      { text: 'Documentation and handover training' },
    ],
  },
  {
    id: 'cost',
    name: 'Inference cost optimisation',
    problem: "Our AI bills keep growing and we don't know why.",
    bestFor: 'Businesses already using AI whose costs are growing or unpredictable.',
    bullets: [
      { text: 'A breakdown of where your AI spend goes' },
      { text: 'Options such as smaller or quantised models, caching or local hosting' },
      { text: 'Before-and-after measurements from your own usage' },
      { text: 'A recommended setup' },
    ],
  },
  {
    id: 'security',
    name: 'AI Security Review',
    problem: 'We use AI tools, but could they leak our data?',
    bestFor: 'Find out where your AI tools could leak data or be misused, before someone else does.',
    bullets: [
      { lead: 'Map your AI use:', text: 'the tools and features you use or have built, what data flows into them, and who has access' },
      { lead: 'Check the settings that leak data:', text: 'sharing, retention, model-training and access settings' },
      { lead: "Test the AI features you've built, with your written permission:", text: 'prompt injection, data leakage, insecure output handling and excessive agent permissions' },
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
