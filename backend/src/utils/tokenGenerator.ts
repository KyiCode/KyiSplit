import jwt from 'jsonwebtoken'
import { Response } from 'express';
import dotenv from 'dotenv'

dotenv.config()

const generateToken = (userId: string, res: Response) => {
    const tokenDuration = 10
    const payload = { userId: userId };

    const secret = process.env.JWT_KEY;

    if (!secret) throw new Error("JWT_KEY is not defined");

    const token = jwt.sign(payload, secret, {
        expiresIn: `${tokenDuration}d`,
    });

    res.cookie("jwt", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: "strict",
        maxAge: 1000 * 60 * 60 * 24 * tokenDuration
    })

    return token;
};

export default generateToken