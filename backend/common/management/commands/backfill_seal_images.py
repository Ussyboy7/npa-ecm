from django.core.management.base import BaseCommand
from django.db.models import Q

from accounts.models import DocumentSeal
from accounts.services import SealGenerationService


class Command(BaseCommand):
    help = "Backfill seal_image for existing DocumentSeal records that are missing it."

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Apply changes. Default is dry-run (report only).",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Regenerate seal_image even if already present.",
        )
        parser.add_argument(
            "--serial",
            action="append",
            default=[],
            help="Limit to a specific seal serial number (repeatable).",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=0,
            help="Limit number of seals to process (0 = no limit).",
        )

    def handle(self, *args, **options):
        apply = options.get("apply", False)
        force = options.get("force", False)
        serials = [s for s in (options.get("serial") or []) if s]
        limit = int(options.get("limit") or 0)

        if not apply:
            self.stdout.write(self.style.WARNING("DRY RUN (use --apply to perform changes)\n"))

        qs = DocumentSeal.objects.all().select_related("signature_used", "sealed_by").order_by("-sealed_at")
        if serials:
            qs = qs.filter(serial_number__in=serials)
        elif not force:
            qs = qs.filter(Q(seal_image__isnull=True) | Q(seal_image=""))
        if limit > 0:
            qs = qs[:limit]

        seals = list(qs)
        self.stdout.write(f"Found {len(seals)} seal(s) without seal_image.\n")

        ok = 0
        skipped = 0
        err = 0

        for seal in seals:
            try:
                signature = seal.signature_used
                if not signature or not getattr(signature, "signature_image", None):
                    self.stdout.write(self.style.WARNING(f"  SKIP seal={seal.serial_number} (no signature image)"))
                    skipped += 1
                    continue

                png = SealGenerationService._render_seal_png(
                    office_name=seal.office_name,
                    office_title=seal.office_title,
                    serial_number=seal.serial_number,
                    verification_url=seal.verification_url,
                    signature_image_field=signature.signature_image,
                )

                if apply:
                    from django.core.files.base import ContentFile

                    if force and getattr(seal, "seal_image", None):
                        try:
                            seal.seal_image.delete(save=False)
                        except Exception:
                            pass

                    seal.seal_image.save(
                        f"{seal.serial_number}.png",
                        ContentFile(png),
                        save=True,
                    )

                self.stdout.write(self.style.SUCCESS(f"  OK   seal={seal.serial_number}"))
                ok += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  ERR  seal={seal.serial_number}: {e}"))
                err += 1

        self.stdout.write("")
        self.stdout.write(f"OK: {ok}  Skipped: {skipped}  Errors: {err}")
        if not apply and ok:
            self.stdout.write(self.style.WARNING("Run with --apply to save generated seal images."))
