const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests',

    use: {
        baseURL: 'https://converged-dev.testlogdia.lk',

        extraHTTPHeaders: {
            'Content-Type': 'application/json'
        }
    },

    reporter: [
        ['list'],
        ['html', { outputFolder: 'playwright-report' }]
    ]
});