<?php

namespace App\Models;

use App\Traits\AutoFillAuthor;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Registration extends Model
{
    use SoftDeletes, AutoFillAuthor;

    protected $table = 'registrations';

    protected $fillable = [
        'event_id', 'team_id', 'school_id', 'region_id', 'type', 'category',
        'unit_name', 'contact_name', 'contact_phone',
        'player_count', 'coach_count',
        'audit_status', 'reject_reason',
        'city_audited_by', 'city_audited_at',
        'province_audited_by', 'province_audited_at',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'event_id'              => 'integer',
        'team_id'               => 'integer',
        'school_id'             => 'integer',
        'region_id'             => 'integer',
        'type'                  => 'integer',
        'category'              => 'integer',
        'player_count'          => 'integer',
        'coach_count'           => 'integer',
        'audit_status'          => 'integer',
        'city_audited_at'       => 'datetime',
        'province_audited_at'   => 'datetime',
    ];

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class, 'event_id');
    }

    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class, 'region_id');
    }

    public function players(): HasMany
    {
        return $this->hasMany(RegistrationPlayer::class, 'registration_id');
    }

    public function coaches(): HasMany
    {
        return $this->hasMany(RegistrationCoach::class, 'registration_id');
    }

    public function files(): HasMany
    {
        return $this->hasMany(RegistrationFile::class, 'registration_id');
    }

    public function auditRecords(): HasMany
    {
        return $this->hasMany(AuditRecord::class, 'registration_id');
    }

    // ── Scope ──

    public function scopePending(Builder $q): Builder
    {
        return $q->where('audit_status', 0);
    }

    public function scopeCityApproved(Builder $q): Builder
    {
        return $q->where('audit_status', 1);
    }

    public function scopeProvinceApproved(Builder $q): Builder
    {
        return $q->where('audit_status', 2);
    }

    public function scopeRejected(Builder $q): Builder
    {
        return $q->where('audit_status', 3);
    }
}
