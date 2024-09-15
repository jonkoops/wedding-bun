import { Router } from "express";
import { codeRequired } from "../middleware/code-required";
import { renderSVG } from "uqr";
import { environment } from "../environment";

const PHOTOS_URL_SVG = renderSVG(environment.photosUrl);

export const photosRouter = Router();

photosRouter.use(codeRequired);

photosRouter.get("/", (req, res) => res.render("photos", {
  photosUrl: environment.photosUrl,
  photosUrlSvg: PHOTOS_URL_SVG
}));
