# Version must match @playwright/test in package.json.
FROM mcr.microsoft.com/playwright:v1.63.0-noble
WORKDIR /e2e
RUN npm init -y >/dev/null && npm install --no-audit --no-fund @playwright/test@1.63.0
COPY playwright.config.ts ./
COPY e2e ./e2e
CMD ["npx", "playwright", "test"]
