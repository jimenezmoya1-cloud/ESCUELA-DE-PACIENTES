export type Cie10Entry = {
  code: string;
  name: string;
  description: string;
  search: string;
};

export type Cie10Selection = {
  code: string;
  name: string;
};

export function normalizeCie10(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}
