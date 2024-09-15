import { Router } from "express";
import { codeRequired } from "../middleware/code-required";

export const photosRouter = Router();

photosRouter.use(codeRequired);
photosRouter.get("/", (req, res) => res.render("photos"));
