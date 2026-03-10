export function buildLessonNumberReminderTemplate(params: {
  studentName: string
  registerUrl: string
}) {
  const studentName = params.studentName || "Student Pilot"
  const registerUrl = params.registerUrl || "http://localhost:3000/register"

  return {
    subject: "SkyAssess Reminder: Submit Your Lesson Number",
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <p>Good day ${studentName},</p>
        <p>You have an assigned flight schedule in SkyAssess.</p>
        <p>Please log in and submit your <strong>Lesson Number</strong> as soon as possible.</p>
        <p>If you do not have a SkyAssess account yet, please register first.</p>
        <p><a href="${registerUrl}">Register in SkyAssess</a></p>
        <p>Thank you,<br/>WCC Flight Operations</p>
      </div>
    `,
    text: [
      `Good day ${studentName},`,
      "",
      "You have an assigned flight schedule in SkyAssess.",
      "Please log in and submit your Lesson Number as soon as possible.",
      "",
      "If you do not have a SkyAssess account yet, please register first:",
      registerUrl,
      "",
      "Thank you,",
      "WCC Flight Operations",
    ].join("\n"),
  }
}

export function buildFlightAssignmentNotificationTemplate(params: {
  recipientName: string
  recipientRole: "student" | "instructor"
  appUrl: string
  opDate: string
  aircraftType: string
  aircraftRegistry: string
  timeRange: string
  flightType: string
}) {
  const recipientName = params.recipientName || "Flight Crew"
  const recipientRole = params.recipientRole === "instructor" ? "Instructor" : "Student"
  const appUrl = params.appUrl || "http://localhost:3000"
  const scheduleUrl = `${appUrl}/dashboard/tasks`

  return {
    subject: `SkyAssess Flight Assignment: ${params.aircraftType} ${params.aircraftRegistry} (${params.timeRange})`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <p>Good day ${recipientName},</p>
        <p>You have been scheduled by Flight Operations.</p>
        <table style="border-collapse: collapse; margin: 12px 0;">
          <tr><td style="padding: 4px 10px 4px 0;"><strong>Role</strong></td><td style="padding: 4px 0;">${recipientRole}</td></tr>
          <tr><td style="padding: 4px 10px 4px 0;"><strong>Date</strong></td><td style="padding: 4px 0;">${params.opDate}</td></tr>
          <tr><td style="padding: 4px 10px 4px 0;"><strong>Aircraft</strong></td><td style="padding: 4px 0;">${params.aircraftType} - ${params.aircraftRegistry}</td></tr>
          <tr><td style="padding: 4px 10px 4px 0;"><strong>Time Slot</strong></td><td style="padding: 4px 0;">${params.timeRange}</td></tr>
          <tr><td style="padding: 4px 10px 4px 0;"><strong>Flight Type</strong></td><td style="padding: 4px 0;">${params.flightType}</td></tr>
        </table>
        <p>Please log in to SkyAssess for details and required actions.</p>
        <p><a href="${scheduleUrl}">Open SkyAssess</a></p>
        <p>Thank you,<br/>WCC Flight Operations</p>
      </div>
    `,
    text: [
      `Good day ${recipientName},`,
      "",
      "You have been scheduled by Flight Operations.",
      `Role: ${recipientRole}`,
      `Date: ${params.opDate}`,
      `Aircraft: ${params.aircraftType} - ${params.aircraftRegistry}`,
      `Time Slot: ${params.timeRange}`,
      `Flight Type: ${params.flightType}`,
      "",
      "Please log in to SkyAssess for details and required actions:",
      scheduleUrl,
      "",
      "Thank you,",
      "WCC Flight Operations",
    ].join("\n"),
  }
}

export function buildDebriefCompletedTemplate(params: {
  studentName: string
  instructorName: string
  courseCode: string
  lessonNo: string
  appUrl: string
  debriefUrl?: string
}) {
  const studentName = params.studentName || "Student Pilot"
  const instructorName = params.instructorName || "Flight Instructor"
  const courseCode = params.courseCode || "PPL"
  const lessonNo = params.lessonNo || "N/A"
  const appUrl = params.appUrl || "http://localhost:3000"
  const debriefUrl = params.debriefUrl || `${appUrl}/dashboard/debrief/ppl`

  return {
    subject: `SkyAssess Debrief Completed: ${courseCode} Lesson ${lessonNo}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <p>Good day ${studentName},</p>
        <p>Your ${courseCode} debriefing has been completed by ${instructorName}.</p>
        <p><strong>Lesson No.:</strong> ${lessonNo}</p>
        <p>You may now review your signed debrief record in SkyAssess.</p>
        <p><a href="${debriefUrl}">Open Debrief Record</a></p>
        <p>Thank you,<br/>WCC Flight Operations</p>
      </div>
    `,
    text: [
      `Good day ${studentName},`,
      "",
      `Your ${courseCode} debriefing has been completed by ${instructorName}.`,
      `Lesson No.: ${lessonNo}`,
      "",
      "You may now review your signed debrief record in SkyAssess:",
      debriefUrl,
      "",
      "Thank you,",
      "WCC Flight Operations",
    ].join("\n"),
  }
}
