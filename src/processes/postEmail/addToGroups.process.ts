import { Job } from "bull";
import { google } from "googleapis";

import { Subscription } from "../../common/types";

const addToGroups = async (job: Job<Subscription>) => {
  const SCOPES = [
    "https://www.googleapis.com/auth/admin.directory.group",
    "https://www.googleapis.com/auth/admin.directory.group.member"
  ];

  const auth = new google.auth.JWT({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: SCOPES,
    subject: process.env.GOOGLE_WORKSPACE_ADMIN_ACCOUNT
  });

  const admin = google.admin({
    version: "directory_v1",
    auth
  });

  const address: string = job.data.email;

  job.progress(50);
  job.log(`Adding ${address} to group...`);
  admin.members
    .insert({
      groupKey: process.env.GROUP_ID,
      requestBody: {
        email: address,
        role: "MEMBER"
      }
    })
    .then(() => {
      job.progress(100);
      job.log(`Added ${address} to group.`);
    })
    .catch((err) => {
      job.log(`Failed to add ${address} to group.`);
      job.moveToFailed(err, true);
    });
};

export default addToGroups;
