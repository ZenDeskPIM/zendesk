/**
 * Garante que identificadores de usuário não exponham e-mails completos na UI.
 * Retorna apenas o trecho antes do "@" ou um fallback amigável.
 */
export function maskUserIdentifier(raw?: string | null): string {
    if (!raw) return "Não informado";
    const trimmed = raw.trim();
    if (!trimmed) return "Não informado";
    if (!trimmed.includes("@")) return trimmed;
    const [name] = trimmed.split("@");
    return name?.trim() ? name.trim() : "Contato";
}
