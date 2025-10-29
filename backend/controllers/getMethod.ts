import express from 'express'

const app = express()

export const getMethod = (req: Request, res: Response) => {
    res.send("hello world")
}