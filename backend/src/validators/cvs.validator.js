const { body, param } = require("express-validator");
const { JOB_CATEGORIES } = require("../config/constants");
const { validate } = require("./validate");

module.exports = {
  cvId: [param("cvId").isMongoId(), validate],
  uploadCv: [body("category").isIn(JOB_CATEGORIES), validate],
};
