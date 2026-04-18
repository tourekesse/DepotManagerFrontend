## Environment Configuration: Backend URL

This project uses a single environment variable, `VITE_BACKEND_URL`, to configure the backend API base URL for all API calls. This makes it easy to switch between development, staging, production, or ngrok environments.

### How to set the backend URL

1. **Copy `.env.example` to `.env` in the project root:**

	```bash
	cp .env.example .env
	```

2. **Edit `.env` and set `VITE_BACKEND_URL` to your backend's public address:**

	```env
	VITE_BACKEND_URL=https://your-backend-url.example.com
	```

	For local development, you can use:

	```env
	VITE_BACKEND_URL=http://localhost:8080
	```

3. **Restart the Vite dev server after changing `.env`.**

All API calls in the frontend will automatically use this value. No code changes are needed when switching environments—just update `.env`.

See `.env.example` for a template.
# Material UI - Vite.js example

## How to use

Download the example [or clone the repo](https://github.com/mui/material-ui):

<!-- #target-branch-reference -->

```bash
curl https://codeload.github.com/mui/material-ui/tar.gz/master | tar -xz --strip=2 material-ui-master/examples/material-ui-vite
cd material-ui-vite
```

Install it and run:

```bash
npm install
npm run dev
```

or:

<!-- #target-branch-reference -->

[![Edit on StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/mui/material-ui/tree/master/examples/material-ui-vite)

[![Edit on CodeSandbox](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/p/sandbox/github/mui/material-ui/tree/master/examples/material-ui-vite)

## The idea behind the example

This example uses [Vite.js](https://github.com/vitejs/vite).
It includes `@mui/material` and its peer dependencies, including [Emotion](https://emotion.sh/docs/introduction), the default style engine in Material UI.

## What's next?

<!-- #host-reference -->

You now have a working example project.
You can head back to the documentation and continue by browsing the [templates](https://mui.com/material-ui/getting-started/templates/) section.
