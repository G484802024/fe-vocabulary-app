export const categories = {
  fundamentals: ['计算机基础', 'binary', 'indigo'],
  hardware: ['硬件与外设', 'cpu', 'blue'],
  os: ['操作系统', 'layers', 'violet'],
  network: ['网络与互联网', 'network', 'cyan'],
  protocols: ['网络协议', 'globe', 'blue'],
  security: ['信息安全', 'shield', 'rose'],
  database: ['数据库与 SQL', 'database', 'violet'],
  software: ['软件与开发', 'code', 'indigo'],
  algorithms: ['算法与数据结构', 'branch', 'cyan'],
  systems: ['IT 系统管理', 'server', 'blue'],
  services: ['IT 服务管理', 'settings', 'amber'],
  business: ['IT 战略与企业管理', 'briefcase', 'rose'],
} as const;

export type Category = keyof typeof categories;
export const categoryKeys = Object.keys(categories) as Category[];
