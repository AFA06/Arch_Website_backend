// admin/routes/company.js
const express = require("express");
const router = express.Router();
const companyController = require("../controllers/companyController");
const { adminAuth } = require("../../middleware/adminAuth");
const { mainAdminOnly } = require("../../middleware/roleAuth");

// All company routes require admin authentication
router.use(adminAuth);

// Only main admin can manage companies
router.use(mainAdminOnly);

// GET /api/admin/companies - Get all companies
router.get("/", companyController.getCompanies);

// POST /api/admin/companies - Create new company
router.post("/", companyController.createCompany);

// PUT /api/admin/companies/:id - Update company
router.put("/:id", companyController.updateCompany);

// PUT /api/admin/companies/:id/toggle-status - Toggle company status
router.put("/:id/toggle-status", companyController.toggleCompanyStatus);

// GET /api/admin/companies/:id/stats - Get company stats
router.get("/:id/stats", companyController.getCompanyStats);

// DELETE /api/admin/companies/:id - Delete company
router.delete("/:id", companyController.deleteCompany);

module.exports = router;
