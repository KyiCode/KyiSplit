import express from 'express'
import jwt from 'jsonwebtoken'
import database from '../db'

import { Request, Response } from 'express'


const authMiddleware = async (req: Request, res: Response) => {
    console.log("In middleware")

    // set tokenn if have

    // if not token not authorised

    // verify token with kwt.verif


    return
}

export default authMiddleware