Feature: App loads successfully

  Scenario: User opens the app
    Given the app is running
    When I visit the homepage
    Then I should see the page title contains "modAI"
