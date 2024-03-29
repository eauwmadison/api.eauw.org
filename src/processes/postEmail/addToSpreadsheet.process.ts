import { Job } from "bull";
import { google } from "googleapis";

import { Subscription } from "../../common/types";

const addToSpreadsheet = async (job: Job<Subscription>) => {
  const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

  const auth = new google.auth.JWT({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: SCOPES,
    subject: process.env.GOOGLE_WORKSPACE_ADMIN_ACCOUNT
  });

  const sheets = google.sheets({
    version: "v4",
    auth
  });

  const addToSpreadsheetHelper = (
    spreadsheetId: string,
    range: string,
    values: string[][]
  ) => {
    job.progress(50);
    job.log("Appending to spreadsheet...");

    sheets.spreadsheets.values
      .append({
        spreadsheetId,
        range,
        valueInputOption: "USER_ENTERED",
        requestBody: { values }
      })
      .then(() => {
        job.progress(100);
        job.log("Spreadsheet updated.");
      })
      .catch((err: any) => {
        job.moveToFailed(err, true);
      });
  };

  // "EAM" is a proprietary contact label required for Eloqua.
  // Remove if necessary.
  const values = [
    [job.data.email, "EAM", job.data.firstName, "", job.data.source]
  ];
  if (process.env.SPREADSHEET_ID !== undefined) {
    addToSpreadsheetHelper(process.env.SPREADSHEET_ID, "Sheet1!A:E", values);
  } else {
    job.moveToFailed({ message: "SPREADSHEET_ID not defined" }, true);
  }
};

export default addToSpreadsheet;
