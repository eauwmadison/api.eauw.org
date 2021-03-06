import Bull from "bull";

import deleteFromGroups from "../processes/deleteFromGroups.process";
import deleteFromSpreadsheet from "../processes/deleteFromSpreadsheet.process";
import deleteFromEloqua from "../processes/deleteFromEloqua.process";

const deleteEmailQueue = new Bull(
  "DELETE /email",
  process.env.REDIS_URL || "redis://127.0.0.1:6379"
);

const GROUPS_PROCESS_NAME = "Delete from Google Groups";
const SPREADSHEET_PROCESS_NAME = "Delete from Google Spreadsheet";
const ELOQUA_PROCESS_NAME = "Delete from Eloqua";

deleteEmailQueue.process(GROUPS_PROCESS_NAME, (job: any) =>
  deleteFromGroups(job)
);
deleteEmailQueue.process(SPREADSHEET_PROCESS_NAME, (job: any) =>
  deleteFromSpreadsheet(job)
);
deleteEmailQueue.process(ELOQUA_PROCESS_NAME, (job: any) =>
  deleteFromEloqua(job)
);

const createJob = (name: string, data: any) => {
  deleteEmailQueue.add(name, data, {
    attempts: 3
  });
};

const deleteEmail = async (email: string) => {
  const data = {
    email
  };
  createJob(GROUPS_PROCESS_NAME, data);
  createJob(SPREADSHEET_PROCESS_NAME, data);
  createJob(ELOQUA_PROCESS_NAME, data);
};

export { deleteEmail, deleteEmailQueue };
