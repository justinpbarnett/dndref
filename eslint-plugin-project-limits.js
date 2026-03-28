const { ESLint } = require('eslint');
const fs = require('fs');
const path = require('path');

module.exports = {
  rules: {
    'max-lines': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Enforce a maximum number of lines per file',
          category: 'Best Practices',
          recommended: false,
        },
        schema: [
          {
            type: 'object',
            properties: {
              max: { type: 'number' },
            },
            additionalProperties: false,
          },
        ],
        messages: {
          maxLines: 'File has {{lineCount}} lines, which exceeds the maximum of {{max}} lines.',
        },
      },
      create(context) {
        const options = context.options[0] || {};
        const max = options.max || 300;
        const filename = context.getFilename();
        
        // Skip node_modules and hidden files
        if (filename.includes('node_modules') || path.basename(filename).startsWith('.')) {
          return {};
        }

        const sourceCode = context.getSourceCode();
        const lineCount = sourceCode.lines.length;

        if (lineCount > max) {
          context.report({
            loc: { line: 1, column: 0 },
            messageId: 'maxLines',
            data: {
              lineCount,
              max,
            },
          });
        }

        return {};
      },
    },
    'max-dir-files': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Enforce a maximum number of flat files per directory',
          category: 'Best Practices',
          recommended: false,
        },
        schema: [
          {
            type: 'object',
            properties: {
              max: { type: 'number' },
            },
            additionalProperties: false,
          },
        ],
        messages: {
          maxFiles: 'Directory {{directory}} contains {{fileCount}} flat files, which exceeds the maximum of {{max}}.',
        },
      },
      create(context) {
        const options = context.options[0] || {};
        const max = options.max || 20;
        const filename = context.getFilename();
        const directory = path.dirname(filename);
        
        // Skip node_modules
        if (directory.includes('node_modules')) {
          return {};
        }

        // Only report once per directory (on the first file ESLint processes in that dir)
        if (!context.settings || !context.settings._checkedDirs) {
          context.settings = context.settings || {};
          context.settings._checkedDirs = new Set();
        }

        if (context.settings._checkedDirs.has(directory)) {
          return {};
        }
        context.settings._checkedDirs.add(directory);

        try {
          const entries = fs.readdirSync(directory, { withFileTypes: true });
          const flatFiles = entries.filter(entry => 
            entry.isFile() && 
            !entry.name.startsWith('.') &&
            (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || 
             entry.name.endsWith('.js') || entry.name.endsWith('.jsx'))
          );

          if (flatFiles.length > max) {
            context.report({
              loc: { line: 1, column: 0 },
              messageId: 'maxFiles',
              data: {
                directory,
                fileCount: flatFiles.length,
                max,
              },
            });
          }
        } catch (error) {
          // Ignore errors reading directory
        }

        return {};
      },
    },
  },
};
