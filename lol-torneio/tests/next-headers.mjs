export const cookies = () => ({ get: (n) => (globalThis.__cookie && n === 'adm' ? { value: globalThis.__cookie } : undefined) });
