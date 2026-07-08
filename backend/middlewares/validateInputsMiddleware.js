import { body, validationResult } from "express-validator";
import { wilayas } from "../data.js";

export async function verifyCredintials(req, res, next) {
  try {
    const validations = [];

    validations.push(
      body("email").isEmail().withMessage("Invalid email").run(req),
      body("password")
        .isLength({ min: 6 })
        .withMessage("Password must contain at least 6 characters.")
        .matches(/[A-Z]/)
        .withMessage("Password must contain at least one capital letter.")
        .matches(/[a-z]/)
        .withMessage("Password must contain at least one lowercase letter.")
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
  // Validate 'price'
  body("price")
    .optional()
    .customSanitizer((value) => {
      const number = parseFloat(value);
      return isNaN(number) ? undefined : number;
    })
    .isFloat({ gt: 0 })
    .withMessage("Price must be a number greater than 0")
    .custom((value, { req }) => {
      return true;
    }),

  // Validate 'discount_price'
  body("discount_price")
    .optional()
    .customSanitizer((value) => {
      const number = parseFloat(value);
      // 👇 If NaN, convert to 0
      return isNaN(number) ? 0 : number;
    })
    .isFloat({ min: 0 }) // allow 0 now
    .withMessage("Discount price must be a number and not negative")
    .custom((value, { req }) => {
      return true;
    }),

  // Final validator result handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
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
      return true;
    }),

  // Validation for 'discount_end'
  body("discount_end")
    .optional()
    .trim()
    .isISO8601()
    .withMessage("Discount end must be a valid date")
    .custom((value, { req }) => {
      return true;
    }),

  // Custom validator to check order (only if discount_price > 0)
  (req, res, next) => {

    const errors = validationResult(req);
    const { discount_price, discount_start, discount_end } = req.body;

    const parsedDiscountPrice = parseFloat(discount_price);
    const isPriceInvalid =
      isNaN(parsedDiscountPrice) || parsedDiscountPrice === 0;

    if (isPriceInvalid) {
      return next();
    }

    // Return any format errors from previous validators
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (discount_start && discount_end) {
      const start = new Date(discount_start);
      const end = new Date(discount_end);

      if (start > end) {
        return res.status(400).json({
          errors: [
            {
              msg: "Discount start must be before or equal to discount end",
              param: "discount_start",
              location: "body",
            },
          ],
        });
      }
      console.log("[validateDiscountDates] Date order is valid.");
    } else {
      console.log(
        "[validateDiscountDates] One or both dates not provided; skipping order check."
      );
    }

    next();
  },
];

export function validateOrderFields(req, res, next) {
  const { email, phone } = req.body;

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  // Phone validation
  // Starts with 0, followed by 5/6/7, then 4-9, then 7 digits 0-9
  const phoneRegex = /^0[567][4-9]\d{7}$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({
      error:
        "صيغة رقم الهاتف غير صحيحة. يجب أن يبدأ بـ 05 أو 06 أو 07، متبوعًا برقم بين 4 و9، ثم 7 أرقام أخرى.",
    });
  }

  // If all validations pass, proceed to the next middleware/route handler
  next();
}
