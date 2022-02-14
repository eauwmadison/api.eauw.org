import Bull from "bull";

import sendConfirmationEmail from "../processes/sendConfirmationEmail.process";
import addToGroups from "../processes/addToGroups.process";
import addToSpreadsheet from "../processes/addToSpreadsheet.process";

const postEmailQueue = new Bull(
  "POST /email",
  process.env.REDIS_URL || "redis://127.0.0.1:6379"
);

const createJob = (name: string, data: any) => {
  postEmailQueue.add(name, data, {
    attempts: 3
  });
};

const GROUPS_PROCESS_NAME = "Add to Google Groups";
const SPREADSHEET_PROCESS_NAME = "Add to Google Spreadsheet";
const CONFIRMATION_EMAIL_PROCESS_NAME = "Send Confirmation Email";

postEmailQueue.process(GROUPS_PROCESS_NAME, (job: any) => addToGroups(job));
postEmailQueue.process(SPREADSHEET_PROCESS_NAME, (job: any) =>
  addToSpreadsheet(job)
);
postEmailQueue.process(CONFIRMATION_EMAIL_PROCESS_NAME, (job: any) =>
  sendConfirmationEmail(job)
);

const postEmail = async (email: string, firstName: string) => {
  const data = {
    email,
    firstName
  };
  createJob(GROUPS_PROCESS_NAME, data);
  createJob(SPREADSHEET_PROCESS_NAME, data);
  createJob(CONFIRMATION_EMAIL_PROCESS_NAME, data);
};

export { postEmail, postEmailQueue };