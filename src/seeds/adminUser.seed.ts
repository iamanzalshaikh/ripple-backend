import connectDB from "../config/db.js";
import logger from "../config/logger.js";
import AdminUser, {
  AdminAccountStatus,
  AdminRole,
} from "../models/adminUser.model.js";

const ADMIN_SEED = {
  name: "Anzal Admin",
  email: "shaikhanzal94@gmail.com",
  password: "Admin@123",
  role: AdminRole.SUPER_ADMIN,
  status: AdminAccountStatus.ACTIVE,
};

const seedAdminUser = async () => {
  try {
    await connectDB();
    logger.info("✅ Connected to database");

    let admin = await AdminUser.findOne({ email: ADMIN_SEED.email.toLowerCase() });

    if (!admin) {
      admin = new AdminUser({
        name: ADMIN_SEED.name,
        email: ADMIN_SEED.email.toLowerCase(),
        password: ADMIN_SEED.password,
        role: ADMIN_SEED.role,
        status: ADMIN_SEED.status,
      });

      await admin.save();
      logger.info(`✅ Created admin: ${ADMIN_SEED.email}`);
    } else {
      admin.name = ADMIN_SEED.name;
      admin.password = ADMIN_SEED.password; // hashed by pre-save hook
      admin.role = ADMIN_SEED.role;
      admin.status = ADMIN_SEED.status;
      admin.isLocked = false;
      admin.lockedUntil = undefined;
      admin.failedLoginAttempts = 0;

      await admin.save();
      logger.info(`✅ Updated existing admin: ${ADMIN_SEED.email}`);
    }

    logger.info("✅ Admin seed completed");
  } catch (error: any) {
    logger.error(`❌ Error seeding admin user: ${error.message}`);
    throw error;
  }
};

const runAsScript = process.argv[1]?.includes("adminUser.seed");
if (runAsScript) {
  seedAdminUser()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default seedAdminUser;

