# A web application for Bajrang Badminton academy

## Business Requirements
This project is to build an attractive and appealing web application that is eye catching which uses modern graphics and design practices and include features:
- The app must also have the user registration feature
- The app should provide a login panel which must have admin and user login
- Admin logged in user should have features to update the website information like coach details, Available slots, contact information and you are free to decide the other information that an admin user can do
- Admin logged in user must have an inbox in which newly registered users details should be there with approve and reject button, once approved by admin a user status should become active otherwise inactive.
- Admin logged in user should also have a feature to mark existing active user to inactive
- Admin user can also add other users as admin
- Logged in user can see his personal details along with status active/inactive.
- The website UI must be eye catching.


## Coding Standards
- Use latest versions of libraries and idiomatic approaches as of today
- When hitting issues, always identify root cause before trying a fix. Do not guess. Prove with evidence, then fix the root cause.
- use docker to setup the technical stack and for testing

## Technincal stack
- Next.js for frontend
- python only if required for backend
- postgre sql database for persistence
- Better auth



**********

  ⎿  Wrote 186 lines to e2e\academy.spec.ts
       1 import { expect, test, type Page } from "@playwright/test";
       2
       3 const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@bajrang.academy";
       4 const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin@12345";
       5 const PASSWORD = "Player@12345";

*************************************************************************************************************************************************************  Improvements                                                                                                                                            *
************************************************************************************************************************************************************
##Admin logged in user
- Member section
-- All the filter should show a page with 50 records at a time only or should be selected by admin with factor of 10, Minimum 10.
-- include delete button in inactive filter to delete a member permanently
-- In members all filters the status badge overlaps fix it
-- After logged in as admin user the logout button should visible with all menus, it is only visible with overview menu
-- Admin user should also be able to edit the user information,in addition can upload the picture of student
-- Give an option to publish the testimonials by admin with images.


##User facing page
-- Where champions take flight text have AI kind of image it should be matching
-- The avatar images are static with text right under the book your first session button. The image should come from most recent approved users, in case image is not present take user's name initial for avatar image. Hovering mouse/clicking on avatar image should bring general information about the user.



##user registration
-- user registration has testimonial it should be removed, fill it with some cool information, use your ability to make it cool
-- It does not have phone number validation(phone number should be of 10 numbers, country code is +91 which should remain fixed, user should not type country code)
-- reduce the gap while navigating the website downwords there is substantial amount of black background