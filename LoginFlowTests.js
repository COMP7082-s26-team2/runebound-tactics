const { Builder, By, until } = require('selenium-webdriver');

describe('Player Authentication E2E Flow', () => {
    let driver;

    // Launch Chrome before running the tests
    beforeAll(async () => {
        driver = await new Builder().forBrowser('chrome').build();
    });

    // Shut down the browser after tests finish
    afterAll(async () => {
        await driver.quit();
    });

    test('incorrect credentials should display an error message', async () => {
        await driver.get('http://localhost:3000/login');

        // Locate input fields and type in dummy data
        await driver.findElement(By.id('email')).sendKeys('test@example.com');
        await driver.findElement(By.id('password')).sendKeys('WrongPassword123!');
        
        // Click the login button
        await driver.findElement(By.id('login-btn')).click();

        // Wait for the error message to appear and verify its text
        const errorElement = await driver.wait(
            until.elementLocated(By.id('auth-error')),
            5000 // 5 second timeout
        );
        
        const errorText = await errorElement.getText();
        expect(errorText).toContain('Invalid login credentials');
    }, 15000);

    test('successful login directs player to the main menu', async () => {
        await driver.get('http://localhost:3000/login');

        // Input valid credentials (you would use a dedicated test account in your Supabase DB here)
        await driver.findElement(By.id('email')).sendKeys('valid_tactician@example.com');
        await driver.findElement(By.id('password')).sendKeys('CorrectPassword456!');
        
        await driver.findElement(By.id('login-btn')).click();

        // Verify the browser is redirected to the main menu URL
        await driver.wait(until.urlIs('http://localhost:3000/main-menu'), 5000);
        
        // Verify a main menu element (like the play button) is rendered
        const playButton = await driver.wait(
            until.elementLocated(By.xpath("//button[text()='Start']")),
            5000
        );
        expect(await playButton.isDisplayed()).toBe(true);
    }, 15000);
});