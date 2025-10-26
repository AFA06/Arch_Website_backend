const Company = require("../../models/Company");
const User = require("../../models/User");

// ✅ Get all companies
exports.getCompanies = async (req, res) => {
  try {
    const { search, status } = req.query;
    const query = {};

    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [{ name: regex }, { description: regex }];
    }

    if (status) query.isActive = status === "active";

    const companies = await Company.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(companies);
  } catch (err) {
    console.error("❌ Error fetching companies:", err);
    res.status(500).json({ error: "Failed to fetch companies" });
  }
};

// ✅ Create company
exports.createCompany = async (req, res) => {
  try {
    const { name, description, contactEmail, contactPhone } = req.body;

    // Check if company already exists
    const existingCompany = await Company.findOne({ name });
    if (existingCompany) {
      return res.status(400).json({ error: "Company already exists" });
    }

    const newCompany = new Company({
      name,
      description: description || "",
      contactEmail,
      contactPhone,
      createdBy: req.user.id
    });

    await newCompany.save();

    // Populate the createdBy field for response
    await newCompany.populate('createdBy', 'name email');

    res.status(201).json({
      message: "Company created successfully",
      company: newCompany
    });
  } catch (error) {
    console.error("❌ Error creating company:", error);
    res.status(500).json({ error: "Error creating company" });
  }
};

// ✅ Update company
exports.updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, contactEmail, contactPhone, isActive } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedCompany = await Company.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!updatedCompany) {
      return res.status(404).json({ error: "Company not found" });
    }

    res.json({
      message: "Company updated successfully",
      company: updatedCompany
    });
  } catch (error) {
    console.error("❌ Error updating company:", error);
    res.status(500).json({ error: "Error updating company" });
  }
};

// ✅ Toggle company status
exports.toggleCompanyStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    const newStatus = !company.isActive;
    const updatedCompany = await Company.findByIdAndUpdate(
      id,
      { isActive: newStatus },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    res.json({
      message: `Company ${newStatus ? 'activated' : 'deactivated'} successfully`,
      company: updatedCompany
    });
  } catch (error) {
    console.error("❌ Error toggling company status:", error);
    res.status(500).json({ error: "Error toggling company status" });
  }
};

// ✅ Get company stats
exports.getCompanyStats = async (req, res) => {
  try {
    const { id } = req.params;

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    // Count admins for this company
    const User = require("../../models/User");
    const adminCount = await User.countDocuments({
      companyId: id,
      isAdmin: true,
      adminRole: 'company'
    });

    // Count courses for this company
    const Course = require("../../models/Course");
    const courseCount = await Course.countDocuments({
      companyId: id,
      ownerType: 'company'
    });

    // Count payments for this company
    const Payment = require("../../models/Payment");
    const paymentStats = await Payment.aggregate([
      {
        $match: {
          companyId: require("mongoose").Types.ObjectId(id),
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$companyShare' },
          totalPayments: { $sum: 1 }
        }
      }
    ]);

    const stats = paymentStats[0] || { totalRevenue: 0, totalPayments: 0 };

    res.json({
      companyId: id,
      stats: {
        adminCount,
        courseCount,
        totalRevenue: stats.totalRevenue,
        totalPayments: stats.totalPayments
      }
    });
  } catch (error) {
    console.error("❌ Error getting company stats:", error);
    res.status(500).json({ error: "Error getting company stats" });
  }
};

// ✅ Delete company
exports.deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if company has associated courses or admins
    const coursesCount = await require("../../models/Course").countDocuments({ companyId: id });
    const adminsCount = await User.countDocuments({ companyId: id });

    if (coursesCount > 0 || adminsCount > 0) {
      return res.status(400).json({
        error: "Cannot delete company with associated courses or admins. Please reassign or remove them first."
      });
    }

    const deletedCompany = await Company.findByIdAndDelete(id);

    if (!deletedCompany) {
      return res.status(404).json({ error: "Company not found" });
    }

    res.json({ message: "Company deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting company:", error);
    res.status(500).json({ error: "Error deleting company" });
  }
};
