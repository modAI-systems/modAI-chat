Feature: App loads successfully

  Scenario: User opens the app
    When I visit the homepage
    Then I should see the page title contains "modAI"

  Scenario Outline: User gets redirected to /chat as fallback
    When I visit the url path "<path>"
    Then the url path should be "/chat"

    Examples:
      | path  |
      | /     |
      | /chat |
      | /foo  |
