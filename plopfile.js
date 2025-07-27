// TypeScript Project Bootstrap Template
export default function (plop) {
  plop.setGenerator('typescript-starter', {
    description: 'Creates a new TypeScript project',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'What is the project name?',
      },
      {
        type: 'input',
        name: 'description',
        message: 'Project description:',
        default: 'A TypeScript project',
      },
      {
        type: 'input',
        name: 'author',
        message: 'Author name:',
        default: 'Yves Kaufmann <yv35kaufmann@gmail.com>',
      },
    ],
    actions: [
      // Process and render .hbs template files
      {
        type: 'addMany',
        destination: './{{dashCase name}}',
        base: 'templates/ts-app',
        templateFiles: 'templates/ts-app/**/*.hbs',
        globOptions: {
          dot: true, // Include hidden files (.gitignore, .eslintrc, etc.)
        },
      },
      // Copy non-template files without processing
      {
        type: 'addMany',
        destination: './{{dashCase name}}',
        base: 'templates/ts-app',
        templateFiles: ['templates/ts-app/**/*', '!templates/ts-app/**/*.hbs'],
        globOptions: {
          dot: true, // Include hidden files
        },
        skipIfExists: true,
        abortOnFail: true,
      },
      // Show success message
      function (data) {
        return `🎉 TypeScript project "${data.name}" has been created successfully!`;
      },
    ],
  });
};
