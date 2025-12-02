#!/usr/bin/env node

/**
 * CLI entry point for site-cloner
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { cloneSite } from './index.js';
import type { CloneOptions } from './types/index.js';

const program = new Command();

program
  .name('site-cloner')
  .description('Clone and reconstruct websites as clean React + Tailwind projects')
  .version('1.0.0')
  .argument('<url>', 'URL of the website to clone')
  .option('-o, --output <dir>', 'Output directory (default: ./output/{domain})')
  .option('-v, --verbose', 'Enable verbose logging', false)
  .option('--no-animations', 'Skip animation extraction')
  .option('--no-assets', 'Skip asset downloading')
  .option('--timeout <ms>', 'Page load timeout in milliseconds', '30000')
  .option('--headless', 'Run browser in headless mode (default)', true)
  .option('--visible', 'Show browser window for debugging')
  .action(async (url: string, options: any) => {
    const startTime = Date.now();

    console.log(chalk.cyan.bold('\n🌐 Site Cloner\n'));
    console.log(chalk.gray(`Target: ${url}\n`));

    // Parse options
    const timeout = parseInt(options.timeout, 10);
    const headless = options.visible ? false : options.headless;

    const spinner = ora({
      text: 'Initializing...',
      color: 'cyan'
    }).start();

    try {
      // Build clone options
      const cloneOptions: CloneOptions = {
        output: options.output,
        verbose: options.verbose,
        includeAnimations: options.animations,
        includeAssets: options.assets,
        timeout: isNaN(timeout) ? 30000 : timeout,
        headless
      };

      // Show what we're doing
      if (options.verbose) {
        console.log(chalk.gray('\nOptions:'));
        console.log(chalk.gray(`  Output: ${cloneOptions.output || 'auto'}`));
        console.log(chalk.gray(`  Animations: ${cloneOptions.includeAnimations ? 'yes' : 'no'}`));
        console.log(chalk.gray(`  Assets: ${cloneOptions.includeAssets ? 'yes' : 'no'}`));
        console.log(chalk.gray(`  Timeout: ${cloneOptions.timeout}ms`));
        console.log(chalk.gray(`  Headless: ${cloneOptions.headless ? 'yes' : 'no'}\n`));
      }

      // Execute cloning
      const result = await cloneSite(url, cloneOptions);

      spinner.succeed(chalk.green('Site cloning completed successfully!'));

      // Display results
      console.log(chalk.cyan('\n📊 Results:\n'));
      console.log(chalk.gray('  Output directory:'), chalk.white(result.outputDir));
      console.log(chalk.gray('  Components extracted:'), chalk.white(result.components));
      console.log(chalk.gray('  Assets downloaded:'), chalk.white(result.assets));

      if (result.errors && result.errors.length > 0) {
        console.log(chalk.yellow('\n⚠️  Warnings:\n'));
        result.errors.forEach(error => {
          console.log(chalk.yellow(`  • ${error}`));
        });
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(chalk.gray('\n  Duration:'), chalk.white(`${duration}s`));

      // Next steps
      console.log(chalk.cyan('\n🚀 Next Steps:\n'));
      console.log(chalk.white(`  cd ${result.outputDir}`));
      console.log(chalk.white('  npm install'));
      console.log(chalk.white('  npm run dev'));
      console.log();

    } catch (error) {
      spinner.fail(chalk.red('Site cloning failed'));

      console.log(chalk.red('\n❌ Error:\n'));

      if (error instanceof Error) {
        console.log(chalk.red(`  ${error.message}`));

        if (options.verbose && error.stack) {
          console.log(chalk.gray('\nStack trace:'));
          console.log(chalk.gray(error.stack));
        }
      } else {
        console.log(chalk.red(`  ${String(error)}`));
      }

      console.log(chalk.yellow('\n💡 Tips:\n'));
      console.log(chalk.gray('  • Make sure the URL is accessible'));
      console.log(chalk.gray('  • Try increasing --timeout if the site is slow'));
      console.log(chalk.gray('  • Use --visible to see browser debugging'));
      console.log(chalk.gray('  • Use --verbose for detailed error logs'));
      console.log();

      process.exit(1);
    }
  });

export async function runCLI(): Promise<void> {
  await program.parseAsync(process.argv);
}

// Auto-run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  runCLI().catch(console.error);
}
