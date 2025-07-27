import {body,validationResult} from 'express-validator';
import { wilayas } from '../data.js';

export async function verifyCredintials(req,res,next){
    try{
        const validations = [];

        validations.push(
            body('email').isEmail().withMessage('Invalid email').run(req),
            body('password')
            .isLength({ min: 6 }).withMessage('Password must contain at least 8 characters.')
            .matches(/[A-Z]/).withMessage('Password must contain at least one capital letter.')
            .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter.')
            .matches(/[0-9]/).withMessage('Password must contain at least one number.')
            .run(req)          
        );
    
        await Promise.all(validations);
    
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
    
        next();
    }catch(err){
        console.error("Erreur :", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function verifyId(req,res,next){
    try{
        const {id} = req.params;
        if (isNaN(id)) {
            return res.status(400).json({ message: "Invalid category ID" });
        }
        next();
    }catch(err){
        console.error("Erreur :", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function verifyName(req,res,next){
    try{
        const { name } = req.body;
        if (!name || name.trim() === "") {
            return res.status(400).json({ message: "Category name is required" });
        }
        next();
    }catch(err){
        console.error("Erreur :", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function verifyWilaya(req, res, next) {
    try{
        const { wilaya } = req.body;

        if (!wilaya || wilaya.trim() === "") {
            return res.status(400).json({ message: "اسم الولاية مطلوب" });
        }
    
        const found = wilayas.find(w => w.ar_name === wilaya.trim());
    
        if (!found) {
            return res.status(404).json({ message: "الولاية غير موجودة" });
        }
    
        // Attach wilaya info to request if needed later
        req.wilayaInfo = {
            id: found.id,
            fr_name: found.name,
            ar_name: found.ar_name
        };
    
        next();
    }catch(err){
        console.error("Erreur :", err);
        res.status(500).json({ message: "Internal server error" });
    }
}