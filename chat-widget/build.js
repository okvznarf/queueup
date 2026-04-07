import { build, context } from 'esbuild';

const isWatch = process.argv.includes('--watch');

const config = {
  entryPoints: ['src/widget.tsx'],
  bundle: true,
  minify: !isWatch,
  format: 'iife',
  globalName: 'QueueUpWidget',
  jsxImportSource: 'preact',
  jsx: 'automatic',
  outfile: '../public/widget/chat.js',
  define: { 'process.env.NODE_ENV': isWatch ? '"development"' : '"production"' },
};

if (isWatch) {
  const ctx = await context(config);
  await ctx.watch();
  console.log('Watching...');
} else {
  await build(config);
  console.log('Built to ../public/widget/chat.js');
}
