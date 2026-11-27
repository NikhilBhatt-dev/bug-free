jest.mock("../src/models", () => ({
  EmailJob: {
    find: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateMany: jest.fn(),
    updateOne: jest.fn(),
  },
  SentEmail: {
    countDocuments: jest.fn(),
  },
  CV: {},
  UserSettings: {
    findOne: jest.fn(),
    updateOne: jest.fn(),
  },
}));

jest.mock("../src/services/gmail.service", () => ({
  sendEmail: jest.fn(),
  isGmailRateLimitError: jest.fn(),
}));

const worker = require("../src/services/email.worker");
const { EmailJob } = require("../src/models");

describe("Email worker safety", () => {
  it("marks in-progress work for uncertainty during restart recovery", async () => {
    EmailJob.updateMany.mockResolvedValue({ modifiedCount: 2 });
    await worker.recoverAfterRestart();
    expect(EmailJob.updateMany).toHaveBeenCalledWith(
      { status: "processing" },
      expect.objectContaining({
        $set: expect.objectContaining({ status: "uncertain" }),
      }),
    );
  });

  it("exports worker controls and recovery operations", () => {
    expect(typeof worker.startWorker).toBe("function");
    expect(typeof worker.stopWorker).toBe("function");
    expect(typeof worker.workerTick).toBe("function");
  });
});
