import { body, validationResult } from "express-validator";
import { wilayas } from "../data.js";

export async function verifyCredintials(req, res, next) {
  try {
    const validations = [];

    validations.push(
      body("email").isEmail().withMessage("Invalid email").run(req),
      body("password")
        .isLength({ min: 6 })
        .withMessage("Password must contain at least 8 characters.")
        .matches(/[A-Z]/)
        .withMessage("Password must contain at least one capital letter.")
        .matches(/[a-z]/)
        .withMessage("Password must contain at least one lowercase letter.")
        .matches(/[0-9]/)
        .withMessage("Password must contain at least one number.")
        .run(req)
    );

    await Promise.all(validations);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    next();
  } catch (err) {
    console.error("Erreur :", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function verifyId(req, res, next) {
  try {
    const { id } = req.params;
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid category ID" });
    }
    next();
  } catch (err) {
    console.error("Erreur :", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function verifyName(req, res, next) {
  try {
    const { name } = req.body;
    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Category name is required" });
    }
    next();
  } catch (err) {
    console.error("Erreur :", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function verifyWilaya(req, res, next) {
  try {
    const { wilaya } = req.body;

    if (!wilaya || wilaya.trim() === "") {
      return res.status(400).json({ message: "اسم الولاية مطلوب" });
    }

    const found = wilayas.find((w) => w.ar_name === wilaya.trim());

    if (!found) {
      return res.status(404).json({ message: "الولاية غير موجودة" });
    }

    // Attach wilaya info to request if needed later
    req.wilayaInfo = {
      id: found.id,
      fr_name: found.name,
      ar_name: found.ar_name,
    };

    next();
  } catch (err) {
    console.error("Erreur :", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Validate price and discount_price as numbers
export const validateNumber = [
  // Validation for 'price'
  body("price")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("Price must be a number greater than 0")
    .custom((value, { req }) => {
      console.log(`[validateNumber] Checking 'price': ${value}`);
      return true; // Return true to indicate success for this custom check
    }),

  // Validation for 'discount_price'
  body("discount_price")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("Discount price must be a number greater than 0")
    .custom((value, { req }) => {
      console.log(`[validateNumber] Checking 'discount_price': ${value}`);
      return true;
    }),

  // Handle validation result
  (req, res, next) => {
    console.log("[validateNumber] Running validation result handler.");
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log(
        "[validateNumber] Validation errors found:",
        JSON.stringify(errors.array(), null, 2)
      );
      return res.status(400).json({ errors: errors.array() });
    }
    console.log(
      "[validateNumber] No validation errors for numbers. Proceeding."
    );
    next();
  },
];

// Validate discount dates
export const validateDiscountDates = [
  // Validation for 'discount_start'
  body("discount_start")
    .optional()
    .trim()
    .isISO8601()
    .withMessage("Discount start must be a valid date")
    .custom((value, { req }) => {
      console.log(
        `[validateDiscountDates] Checking 'discount_start': ${value}`
      );
      return true;
    }),

  // Validation for 'discount_end'
  body("discount_end")
    .optional()
    .trim()
    .isISO8601()
    .withMessage("Discount end must be a valid date")
    .custom((value, { req }) => {
      console.log(`[validateDiscountDates] Checking 'discount_end': ${value}`);
      return true;
    }),

  // Custom validator to check order
  (req, res, next) => {
    console.log("[validateDiscountDates] Running custom date order validator.");
    const errors = validationResult(req); // Re-run validationResult here to capture errors from previous checks in this chain

    if (req.body) {
      const { sale_start_at, sale_end_at } = req.body; // Using sale_start_at/sale_end_at based on your previous JSDoc and `createProduct` logic.
      // If your actual body fields are `discount_start`/`discount_end`, adjust this line.

      if (!errors.isEmpty()) {
        console.log(
          "[validateDiscountDates] Initial date format errors found:",
          JSON.stringify(errors.array(), null, 2)
        );
        return res.status(400).json({ errors: errors.array() });
      }

      if (sale_start_at && sale_end_at) {
        // Use the corrected names here
        console.log(
          `[validateDiscountDates] Comparing dates: Start=${sale_start_at}, End=${sale_end_at}`
        );
        const start = new Date(sale_start_at);
        const end = new Date(sale_end_at);

        if (start > end) {
          console.log(
            "[validateDiscountDates] Date order error: Start is after End."
          );
          return res.status(400).json({
            errors: [
              {
                msg: "Discount start must be before or equal to discount end",
                param: "sale_start_at", // Adjust param name if your fields are discount_start
                location: "body",
              },
            ],
          });
        }
        console.log("[validateDiscountDates] Date order is valid.");
      } else {
        console.log(
          "[validateDiscountDates] One or both discount dates not provided for order check."
        );
      }
    } else {
      console.log(
        "[validateDiscountDates] Request body is empty for date validation."
      );
    }
    console.log(
      "[validateDiscountDates] No date validation errors. Proceeding."
    );
    next();
  },
];
