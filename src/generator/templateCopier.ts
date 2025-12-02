import * as fs from 'fs/promises';
import * as path from 'path';

export async function copyTemplateDirectory(
  templateDir: string,
  destDir: string
): Promise<void> {
  const entries = await fs.readdir(templateDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(templateDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      await fs.mkdir(destPath, { recursive: true });
      await copyTemplateDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

export async function copyTemplateFile(
  templatePath: string,
  destPath: string,
  replacements?: Record<string, string>
): Promise<void> {
  let content = await fs.readFile(templatePath, 'utf-8');

  // Apply replacements if provided
  if (replacements) {
    for (const [key, value] of Object.entries(replacements)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      content = content.replace(regex, value);
    }
  }

  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.writeFile(destPath, content, 'utf-8');
}

export async function templateExists(templatePath: string): Promise<boolean> {
  try {
    await fs.access(templatePath);
    return true;
  } catch {
    return false;
  }
}
