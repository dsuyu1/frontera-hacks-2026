FROM public.ecr.aws/lambda/nodejs:20 AS build

WORKDIR /build
COPY package.json package-lock.json* ./
COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

RUN npm install
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

FROM public.ecr.aws/lambda/nodejs:20
WORKDIR ${LAMBDA_TASK_ROOT}
COPY --from=build /build/node_modules ./node_modules
COPY --from=build /build/prisma ./prisma
COPY --from=build /build/dist ./dist
COPY --from=build /build/package.json ./

CMD ["dist/lambda/handler.handler"]
