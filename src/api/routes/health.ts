import { Router, Request, Response, NextFunction } from 'express'
const route = Router()
export default (app: Router) => {
  app.use('/health', route)
  route.get(
    '/health/checks',
    async (req: Request, res: Response, next: NextFunction) => {
      return res.status(200).send('Healthcheck Successful')
    }
  )
}
