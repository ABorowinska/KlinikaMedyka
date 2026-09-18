import { RequestHandler } from 'express';

export const requireAuth: RequestHandler = (req, res, next) => {
    if (!req.session.user) {
        res.status(401).json({
            error: 'Wymagane logowanie',
        });

        return;
    }

    next();
};
export type RoleName =
    | 'ADMIN'
    | 'LEKARZ'
    | 'RECEPCJA'
    | 'PACJENT';

export const requireRole = (...allowedRoles: RoleName[]): RequestHandler => {
    return (req, res, next) => {
        const user = req.session.user;

        if (!user) {
            res.status(401).json({
                error: 'Wymagane logowanie',
            });

            return;
        }

        const hasRole = allowedRoles.some((role) =>
            user.roleNames.includes(role)
        );

        if (!hasRole) {
            res.status(403).json({
                error: 'Brak wymaganych uprawnień',
            });

            return;
        }

        next();
    };
};