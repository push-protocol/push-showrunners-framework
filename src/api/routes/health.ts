import { Router, Request, Response, NextFunction } from 'express'
import { errors } from 'celebrate'
const route = Router()
export default (app: Router) => {
  // Load the actual external routes
  app.use(`/health`, route)
  app.use(errors())
  // To get core address during channel alias verification
  route.get(
    '/checks',

    async (req: Request, res: Response, next: NextFunction) => {
      return res.status(200).send({})
    }
  )
}
