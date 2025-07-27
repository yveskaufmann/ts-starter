# TypeScript Starter Template

A personal TypeScript project starter template with Plop.js for rapid project bootstrapping.

## Installation

You can install the starter globally or use it directly with `npx`.

### Install Globally

```bash
npm install -g @yveskaufmann/ts-starter
```

### Or use with NPX (no global install required)

```bash
npx @yveskaufmann/ts-starter
```

## Usage

After installation, you can bootstrap a new TypeScript project using the `ts-starter` command.

### Create a New Project

```bash
ts-starter
```

You will be prompted for:
- Project name
- Project description
- Author name

A new directory with your project will be created based on the template.

### Example

```bash
ts-starter
# ? What is the project name? my-awesome-app
# ? Project description: My awesome TypeScript app
# ? Author name: Your Name <your@email.com>
```

This will generate a new folder `my-awesome-app` with all template files.


## Development

To test the generator locally without installing globally:

```bash
npx plop
```

---

Created by Yves Kaufmann
