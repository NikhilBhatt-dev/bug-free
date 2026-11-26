const { EmailTemplate } = require("../src/models");
const templateService = require("../src/services/template.service");

describe("Email template placeholder and category behavior", () => {
  it("extracts the supported template placeholders", () => {
    expect(
      templateService.getPlaceholders(
        "{{companyName}} {{jobRole}} {{hrName}}",
      ),
    ).toEqual(["companyName", "jobRole", "hrName"]);
  });

  it("renders supported placeholders and rejects missing values", () => {
    const rendered = templateService.renderPlaceholders(
      "Hello {{hrName}}, about {{jobRole}} at {{companyName}}.",
      {
        companyName: "Example Inc.",
        jobRole: "Engineer",
        hrName: "Taylor",
      },
    );

    expect(rendered).toBe("Hello Taylor, about Engineer at Example Inc..");
    expect(() =>
      templateService.renderPlaceholders("Hello {{hrName}}", {}),
    ).toThrow(
      expect.objectContaining({ code: "PLACEHOLDER_VALUE_REQUIRED" }),
    );
  });

  it("enforces one template per user and category", () => {
    const categoryIndex = EmailTemplate.schema
      .indexes()
      .find(
        ([fields]) => fields.userId === 1 && fields.category === 1,
      );

    expect(categoryIndex[1].unique).toBe(true);
  });
});
