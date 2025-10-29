# Evaluation Reminder System Setup

## Overview
The evaluation reminder system automatically sends daily reminders to evaluators who haven't completed their evaluations after 3 out of 5 required internal evaluations have been submitted. If evaluators don't complete their evaluations within 5 days of the 3rd evaluation being submitted, the system proceeds with the available evaluations.

## Components

### 1. Database Changes
- Added `reminder_count`, `last_reminder_sent`, and `first_3_completed_date` columns to `evaluator_assignments` table
- Added `evaluations_deadline` and `minimum_evaluations_reached` columns to `call_reports` table
- Added `completed_after_deadline` status to `evaluation_status` enum
- Added `expired_after_deadline` status for evaluator assignments

### 2. Database Functions
- `process_evaluation_completion()` - Updated trigger function that handles the 3/5 -> 5-day deadline logic
- `send_evaluation_reminders()` - Sends daily reminders to pending evaluators
- `run_daily_evaluation_reminders()` - Wrapper function to run the daily reminder system

### 3. Application Code
- `lib/evaluations/reminders.ts` - Contains functions to run daily reminders and check for overdue evaluations
- `lib/email/send-email.ts` - Contains email sending functionality
- `app/api/evaluation-reminders/route.ts` - API route to trigger the reminder system via cron job

## Cron Job Setup

### External Cron Services (Recommended)
You can use external cron services such as:
- Cron-job.org
- UptimeRobot
- Healthchecks.io
- Custom cron service

### Setup Instructions

1. Deploy your application to production
2. Set the `EVALUATION_REMINDER_SECRET` environment variable in your production environment
3. Configure your external cron service to call the following endpoint daily:

```
POST https://your-app-domain.com/api/evaluation-reminders
Authorization: Bearer YOUR_REMINDER_SECRET
```

For example, if using Cron-job.org:
- URL: `https://your-app-domain.com/api/evaluation-reminders`
- Method: `POST`
- Headers: `Authorization: Bearer YOUR_REMINDER_SECRET`
- Frequency: Daily at your preferred time (e.g., 9:00 AM)

### Environment Variables Required
- `EVALUATION_REMINDER_SECRET` - A secret token to secure the reminder API endpoint
- `RESEND_API_KEY` - Your Resend API key for sending email notifications (optional, only needed if you want email reminders)

## How It Works

### 1. Trigger Point
When 3 out of 5 required internal evaluators have submitted their evaluations, the system:
- Marks the call report as having reached the minimum threshold
- Sets a deadline 5 days from that point
- Records the date when the 3rd evaluation was submitted

### 2. Daily Reminder Process
Every day, the cron job:
- Identifies all call reports that have reached the 3/5 threshold but haven't reached 5/5
- For each pending evaluator assignment, checks if a reminder was sent in the last 24 hours
- Sends a reminder email to evaluators who haven't completed their evaluation
- Updates reminder count and last reminder sent timestamp

### 3. Deadline Processing
After 5 days from the 3rd evaluation:
- If all 5 required evaluations are completed, the process continues normally
- If fewer than 5 are completed, the system proceeds with the available evaluations
- Remaining pending assignments are marked as "expired_after_deadline"
- The call report status is updated to "completed_after_deadline"

## Status Values

### New Evaluation Statuses
- `completed_after_deadline` - Used when an evaluation proceeds after the 5-day deadline with fewer than all evaluations completed

### New Assignment Statuses
- `expired_after_deadline` - Used for evaluator assignments that were not completed after the system proceeded

## Error Handling

The reminder system includes error handling:
- If the reminder API is called with an invalid authorization token, it returns a 401 error
- If there are errors in the database function, they are logged and returned in the response
- Email sending errors are logged individually but don't stop the entire process

## Testing

To manually test the system:
1. Submit 3 evaluations for a call report
2. Check that the deadline is set 5 days in the future
3. Call the API endpoint to manually run reminders
4. Check that emails are sent to remaining evaluators
5. Manually update the deadline to a past date to test the deadline processing logic

## Monitoring

The system returns JSON responses with detailed information about:
- Number of reminders sent
- Number of overdue evaluations processed
- Any errors encountered

These can be logged and monitored to ensure the system is working correctly.