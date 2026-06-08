import { Request, Response } from "express"

export const getBalance = async (req: Request, res: Response) => {
    const user = req.user.userId
    const groupId = req.params.groupId

    // need to add currency column, is there an api that calls currency from string?   

}