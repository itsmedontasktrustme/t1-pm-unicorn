Feature: Resident sign-in and registration

  Background:
    Given the following Google accounts:
      | alias      | name                                                         | alternative name                                   | email                              |
      | Resident 1 | Petr Novák                                                   |                                                    | peter.newman@homekeeper.ci         |
      | Resident 2 | Jana Nováková                                                |                                                    | jane.newman@homekeeper.ci          |
      | Resident 3 |                                                              | thomas.newman                                      | thomas.newman@homekeeper.ci        |
      | Resident 4 | Lopadotemachoselachogaleokranioleipsanodrimhypotrimmatosilph | Lopadotemachoselachogaleokranioleipsanodrimhypotri | mireceks.grandfather@homekeeper.ci |
    And the following constants:
      | name           | value                               |
      | emailExistsUrl | /sign-in?status=email-exists&email= |
    And user is on the sign-in page

  Scenario: New resident signs into Homekeeper for the first time
    Given resident "Resident 1" does not exist
    When "Resident 1" signs in with Google
    Then resident "Resident 1" exists in Homekeeper
    And "welcome" page is displayed for resident "Resident 1"
    And message "Your account is ready" is displayed
    And option "Create a household" is displayed
    And option "Join with an invitation" is displayed
    And option "Go to my household" is not displayed

  Scenario: Existing resident signs into Homekeeper
    Given resident "Resident 1" exists
    When "Resident 1" signs in with Google
    Then resident "Resident 1" exists in Homekeeper
    And "welcome" page is displayed for resident "Resident 1"
    And message "Where to next?" is displayed
    And option "Create a household" is displayed
    And option "Join with an invitation" is displayed
    And option "Go to my household" is not displayed


  Scenario: Sign-in is logged once per session even after page reload
    Given resident "Resident 1" exists
    When "Resident 1" signs in with Google
    And reloads the page
    Then exactly one "sign-in" event is recorded for the current session

  Scenario: Already signed-in resident is redirected away from sign-in page
    Given resident "Resident 1" exists
    And "Resident 1" is signed in
    When user navigates to the sign-in page
    Then "welcome" page is displayed

  Scenario: Existing resident's name and email are refreshed from Google on sign-in
    Given resident "Resident 1" exists
    And Google profile for "Resident 1" has updated name "Petr Novák ml."
    When "Resident 1" signs in with Google
    Then resident "Resident 1" keeps the same resident ID
    And resident "Resident 1" has name "Petr Novák ml."
    And no duplicate resident record is created

  Scenario: Existing resident signs into Homekeeper when another resident is signed in
    Given resident "Resident 1" exists
    And resident "Resident 2" exists
    And "Resident 1" signs in with Google
    And user navigates to the sign-in page
    When "Resident 2" signs in with Google
    Then "welcome" page is displayed for resident "Resident 2"
    And resident "Resident 1" exists in Homekeeper
    And resident "Resident 2" exists in Homekeeper

  Scenario: Another resident signs in after previous resident signs out
    Given resident "Resident 1" exists
    And resident "Resident 2" exists
    And "Resident 1" is signed in
    When "Resident 1" signs out
    And "Resident 2" signs in with Google
    Then "welcome" page is displayed for resident "Resident 2"

  Scenario: New resident cancels signing into Homekeeper
    Given resident "Resident 1" does not exist
    When "Resident 1" cancels signing in with Google
    Then "sign-in" page is displayed
    And message "Sign-in with Google was cancelled" is displayed
    And resident "Resident 1" does not exist in Homekeeper

  Scenario: Existing resident cancels signing into Homekeeper
    Given resident "Resident 1" exists
    When "Resident 1" cancels signing in with Google
    Then "sign-in" page is displayed
    And message "Sign-in with Google was cancelled" is displayed
    And resident "Resident 1" exists in Homekeeper

  Scenario: New resident without a display name gets fallback name from email
    Given resident "Resident 3" does not exist
    When "Resident 3" signs in with Google
    Then resident "Resident 3" is created with alternative name

  Scenario: New resident with name longer than 50 characters has name truncated
    Given resident "Resident 4" does not exist
    When "Resident 4" signs in with Google
    Then resident "Resident 4" is created with alternative name

  Scenario: Signed-in resident signs out
    Given resident "Resident 1" exists
    And "Resident 1" is signed in
    When "Resident 1" signs out
    Then "sign-in" page is displayed
    And exactly one "sign-out" event is recorded for the current session
    And resident "Resident 1" exists in Homekeeper

  Scenario: Resident sees session expired screen when backend rejects session
    Given resident "Resident 1" exists
    And "Resident 1" is signed in
    And the resident's session token is expired or invalid
    When reloads the page
    Then message "Your session has expired" is displayed
    And button "Sign in again" is displayed
    When "Resident 1" clicks "Sign in again"
    Then "sign-in" page is displayed

  Scenario Outline: Unauthenticated user cannot access protected pages
    When user navigates to "<path>"
    Then "sign-in" page is displayed

    Examples:
      | path           |
      | /home          |
      | /tasks         |
      | /people        |
      | /profile       |
      | /history       |
      | /welcome       |
      | /household/new |

  Scenario Outline: Signed-out user cannot access protected pages
    Given resident "Resident 1" exists
    And "Resident 1" is signed in
    When "Resident 1" signs out
    And "Resident 1" navigates to "<path>"
    Then "sign-in" page is displayed

    Examples:
      | path           |
      | /home          |
      | /tasks         |
      | /people        |
      | /profile       |
      | /history       |
      | /welcome       |
      | /household/new |

  Scenario: Google sign-in fails to start
    Given Google OAuth provider is unavailable
    When "Resident 1" clicks "Continue with Google"
    Then "sign-in" page is displayed
    And message "We couldn’t open Google sign-in" is displayed

  Scenario: Sign-in page shows warning when email is already linked to another account
    When user navigates to "{emailExistsUrl}{Resident 1.email}"
    Then "sign-in" page is displayed
    And message "A resident with this email already exists" is displayed
    And button "Use a different Google account" is displayed

  Scenario: Error state is shown when profile memberships fail to load
    Given resident "Resident 1" exists
    And "Resident 1" is signed in
    And backend returns server error for resident households
    When "Resident 1" navigates to "/profile"
    Then message "We couldn’t load your profile. Check your connection and try again." is displayed

  Scenario: Profile reloads via retry button after backend recovers
    Given resident "Resident 1" exists
    And "Resident 1" is signed in
    And backend returns server error for resident households
    And "Resident 1" navigates to "/profile"
    And message "We couldn’t load your profile. Check your connection and try again." is displayed
    When backend recovers
    And "Resident 1" clicks "Try again"
    Then "profile" page is displayed
