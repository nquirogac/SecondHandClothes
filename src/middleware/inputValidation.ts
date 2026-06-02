import { body, param, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";

function handleValidationResult(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
}

export const validateLogin = [
  body("email").isEmail().normalizeEmail(),
  body("password").isString().isLength({ min: 8, max: 128 }),
  handleValidationResult,
];

export const validateRegister = [
  body("username")
    .isString()
    .trim()
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_\-\.]+$/),
  body("email").isEmail().normalizeEmail(),
  body("password").isString().isLength({ min: 8, max: 128 }),
  body("bio").optional().isString().isLength({ max: 1000 }),
  handleValidationResult,
];

export const validateCreateItem = [
  body("title").isString().trim().isLength({ min: 3, max: 150 }),
  body("description").optional().isString().isLength({ max: 2000 }),
  body("category").isString().trim().isLength({ min: 1, max: 50 }),
  body("size").isString().trim().isLength({ min: 1, max: 10 }),
  body("condition").isString().trim().isLength({ min: 1, max: 40 }),
  body("price").isFloat({ gt: 0 }),
  handleValidationResult,
];

export const validateComment = [
  param("id").isString().trim().isLength({ min: 1 }),
  body("text").isString().trim().isLength({ min: 1, max: 1000 }),
  handleValidationResult,
];

export const validateChat = [
  body("itemId").isString().trim().isLength({ min: 1, max: 64 }),
  body("receiverId").isString().trim().isLength({ min: 1, max: 64 }),
  body("text").isString().trim().isLength({ min: 1, max: 1000 }),
  handleValidationResult,
];
