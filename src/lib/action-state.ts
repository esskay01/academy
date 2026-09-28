export type FieldErrors = Record<string, string[] | undefined>;

export type ActionState = {
  ok: boolean;
  message: string;
  errors?: FieldErrors;
} | null;
