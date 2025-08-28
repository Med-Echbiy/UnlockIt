import { SteamSchemaResponse, Achievement } from "@/types/achievements";

/**
 * Create INI file content representing game achievements.
 * Format:
 * [meta]
 * app_id=...
 * generated_at=...
 * count=...
 *
 * [achievements]
 * <machine_name>=<json-string>
 *
 * Each achievement value is a JSON string with fields:
 * { displayName, description, hidden, defaultvalue, icon, icongray, unlocked }
 */
export function create_data_ini_file_content(
  schema: SteamSchemaResponse,
  app_id: string
): string {
  const achievements: Achievement[] =
    schema?.game?.availableGameStats?.achievements ?? [];

  const meta = {
    app_id,
    generated_at: new Date().toISOString(),
    count: achievements.length,
  };

  const lines: string[] = [];
  lines.push("[meta]");
  lines.push(`app_id=${meta.app_id}`);
  lines.push(`generated_at=${meta.generated_at}`);
  lines.push(`count=${meta.count}`);
  lines.push("");
  lines.push("[achievements]");

  achievements.forEach((ach) => {
    const key = (
      ach.name ||
      ach.displayName ||
      `ach_${Math.random().toString(36).slice(2, 8)}`
    ).toString();

    const valueObj = {
      name: ach.name ?? null,
      displayName: ach.displayName ?? null,
      description: ach.description ?? null,
      hidden: ach.hidden ?? 0,
      defaultvalue: ach.defaultvalue ?? 0,
      icon: ach.icon ?? null,
      icongray: ach.icongray ?? null,
      unlocked: 0,
    };
    const jsonValue = JSON.stringify(valueObj);
    const safeValue = jsonValue.replace(/\n/g, "\\n");

    lines.push(`${key}=${safeValue}`);
  });
  lines.push("");

  return lines.join("\n");
}
export const crete_data_ini_file_content = create_data_ini_file_content;
