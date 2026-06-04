import express, { NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import database from '../db'
import dotenv from 'dotenv'

import { Request, Response } from 'express'
import { json } from 'node:stream/consumers'

dotenv.config()

const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    console.log("In middleware")

    let token
    const auth = req.headers.authorization

    // set tokenn if have
    if (auth && auth.startsWith("Bearer")) {
        token = auth.split(" ")[1]
    } else if (req.cookies?.jwt) {
        token = req.cookies.jwt
    }

    // if not token not authorised
    if (!token) return res.json({message: "not authorised"})

    // verify token with kwt.verif
    // let decoded
    // try {
    //     decoded = jwt.verify(token, process.env.JWT_KEY)
    // } catch (error) {
    //     return res.status(401).json({error: "Invalid token"})
    // }


    // CHECK TYPE OF DECODED.ID
    // const hasUser = await database.query(
    //     'SELECT * FROM users WHERE id = $1',
    //     [decoded.id]  // need check type
    // )
 
    // if (hasUser.rows.length == 0) return res.json({message: 'User not found'}) 

    // attach user to req, passes req to next
    
    next()
}

export default authMiddleware