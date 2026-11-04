export const NEEDS = [
  { id: 'containers', label: 'Containers', cats: ['docker'], kw: ['container', 'docker', 'podman', 'containerd'] },
  { id: 'orchestration', label: 'Orchestration', cats: ['kubernetes'], kw: ['kubernetes', 'k8s', 'helm', 'orchestration'] },
  { id: 'iac', label: 'Infrastructure as Code', cats: ['terraform'], kw: ['iac', 'infrastructure-as-code', 'terraform', 'opentofu', 'pulumi'] },
  { id: 'config', label: 'Configuration management', cats: ['ansible'], kw: ['ansible', 'configuration management', 'puppet', 'chef'] },
  { id: 'cicd', label: 'CI/CD', cats: ['cicd'], kw: ['ci/cd', 'pipeline', 'github-actions', 'continuous'] },
  { id: 'gitops', label: 'GitOps', cats: ['gitops'], kw: ['gitops', 'argocd', 'argo', 'flux'] },
  { id: 'monitoring', label: 'Metrics & monitoring', cats: ['monitoring'], kw: ['prometheus', 'grafana', 'metrics', 'monitoring', 'alerting'] },
  { id: 'logging', label: 'Logging & tracing', cats: [], kw: ['logging', 'logs', 'tracing', 'opentelemetry', 'jaeger', 'loki', 'observability'] },
  { id: 'security', label: 'Security scanning', cats: ['security'], kw: ['security', 'vulnerability', 'scanner', 'devsecops', 'sast'] },
  { id: 'secrets', label: 'Secrets management', cats: [], kw: ['secrets', 'vault', 'sops', 'kms'] },
  { id: 'databases', label: 'Databases', cats: ['databases'], kw: ['database', 'sql', 'postgres', 'mysql'] },
  { id: 'cloud', label: 'Cloud', cats: ['cloud'], kw: ['aws', 'azure', 'gcp', 'cloud-native', 'serverless'] },
  { id: 'chaos', label: 'Reliability & chaos', cats: [], kw: ['chaos', 'sre', 'resilience', 'incident'] },
];

export const PRESETS = [
  { label: 'Kubernetes platform', needs: ['containers', 'orchestration', 'gitops', 'monitoring', 'security'] },
  { label: 'Startup DevOps', needs: ['containers', 'cicd', 'iac', 'monitoring'] },
  { label: 'Secure delivery', needs: ['cicd', 'security', 'secrets', 'gitops'] },
  { label: 'Full observability', needs: ['monitoring', 'logging', 'chaos'] },
];

const haystack = (t) => [t.name, t.description, t.subcategory, ...(t.topics || [])].join(' ').toLowerCase();

export const suggest = (tools, need, limit = 6) =>
  tools
    .filter((t) => !t.archived && !/^awesome[-\s]/i.test(t.name))
    .map((t) => {
      const text = haystack(t);
      const hits = need.kw.filter((k) => text.includes(k)).length;
      const inCat = need.cats.includes(t.category);
      if (!hits && !inCat) return null;
      const score = (inCat ? 2 : 0) + Math.min(hits, 3) * 1.5 + Math.log10((t.stars || 0) + 10) + (t.trend > 0 ? Math.log10(t.trend + 1) * 0.5 : 0);
      return { t, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.t);

