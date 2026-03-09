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
