const ALIAS_MAP: Record<string, string> = {
  // JavaScript
  js: 'JavaScript',
  javascript: 'JavaScript',
  'java script': 'JavaScript',
  vanillajs: 'JavaScript',
  es6: 'JavaScript',
  es2015: 'JavaScript',

  // TypeScript
  ts: 'TypeScript',
  typescript: 'TypeScript',

  // Python
  py: 'Python',
  python: 'Python',
  python3: 'Python',
  python2: 'Python',

  // Machine Learning
  ml: 'Machine Learning',
  'machine learning': 'Machine Learning',

  // Artificial Intelligence
  ai: 'Artificial Intelligence',
  'artificial intelligence': 'Artificial Intelligence',

  // React
  reactjs: 'React',
  'react.js': 'React',
  react: 'React',
  'react native': 'React Native',

  // Node.js
  node: 'Node.js',
  nodejs: 'Node.js',
  'node.js': 'Node.js',

  // Next.js
  next: 'Next.js',
  nextjs: 'Next.js',
  'next.js': 'Next.js',

  // Vue
  vue: 'Vue.js',
  vuejs: 'Vue.js',
  'vue.js': 'Vue.js',

  // Angular
  angular: 'Angular',
  angularjs: 'Angular',

  // Golang
  go: 'Go',
  golang: 'Go',

  // C variants
  'c++': 'C++',
  cpp: 'C++',
  'c#': 'C#',
  csharp: 'C#',
  'c sharp': 'C#',

  // Kotlin
  kt: 'Kotlin',
  kotlin: 'Kotlin',

  // Swift
  swift: 'Swift',

  // Rust
  rs: 'Rust',
  rust: 'Rust',

  // Ruby
  rb: 'Ruby',
  ruby: 'Ruby',
  'ruby on rails': 'Ruby on Rails',
  ror: 'Ruby on Rails',
  rails: 'Ruby on Rails',

  // PHP
  php: 'PHP',

  // SQL variants
  sql: 'SQL',
  mysql: 'MySQL',
  postgres: 'PostgreSQL',
  postgresql: 'PostgreSQL',
  mongo: 'MongoDB',
  mongodb: 'MongoDB',
  nosql: 'NoSQL',

  // AWS / Cloud
  aws: 'AWS',
  gcp: 'GCP',
  azure: 'Azure',

  // DevOps / tools
  k8s: 'Kubernetes',
  kubernetes: 'Kubernetes',
  docker: 'Docker',
  git: 'Git',
  github: 'GitHub',
  gitlab: 'GitLab',
  ci: 'CI/CD',
  'ci/cd': 'CI/CD',
  cicd: 'CI/CD',

  // Data / ML libs
  tf: 'TensorFlow',
  tensorflow: 'TensorFlow',
  pytorch: 'PyTorch',
  'scikit-learn': 'Scikit-learn',
  sklearn: 'Scikit-learn',
  pandas: 'Pandas',
  numpy: 'NumPy',

  // Misc
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  sass: 'SCSS',
  tailwind: 'Tailwind CSS',
  'tailwind css': 'Tailwind CSS',
  figma: 'Figma',
  graphql: 'GraphQL',
  rest: 'REST APIs',
  'rest api': 'REST APIs',
  'rest apis': 'REST APIs',
  linux: 'Linux',
  bash: 'Bash',
  shell: 'Bash',
  java: 'Java',
  spring: 'Spring Boot',
  'spring boot': 'Spring Boot',
  django: 'Django',
  flask: 'Flask',
  fastapi: 'FastAPI',
  excel: 'Excel',
  communication: 'Communication',
  agile: 'Agile',
}


export function normaliseSkill(raw: string): string {
  const key = raw.trim().toLowerCase()
  return ALIAS_MAP[key] ?? (raw.trim().charAt(0).toUpperCase() + raw.trim().slice(1))
}


export function normaliseSkillList(skills: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const s of skills) {
    const norm = normaliseSkill(s)
    if (norm && !seen.has(norm.toLowerCase())) {
      seen.add(norm.toLowerCase())
      result.push(norm)
    }
  }
  return result
}

export function parseAndNormaliseSkills(raw: string): string[] {
  return normaliseSkillList(
    raw.split(',').map((s) => s.trim()).filter(Boolean)
  )
}