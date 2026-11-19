const express = require('express');
const { isValidUuid } = require('../services/queueService');

function createApiRouter(queueService) {
  const router = express.Router();

  router.get('/health', async (req, res) => {
    try {
      const status = await queueService.checkHealth();
      res.json(status);
    } catch (err) {
      res.status(503).json({
        status: 'error',
        db: false,
        message: err.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  router.get('/areas', async (req, res) => {
    try {
      const areas = await queueService.listAreas();
      res.json({
        areas,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      res.status(500).json({
        error: 'DATABASE_ERROR',
        message: err.message,
      });
    }
  });

  router.get('/queue/:areaId', async (req, res) => {
    const { areaId } = req.params;
    if (!isValidUuid(areaId)) {
      return res.status(400).json({
        error: 'INVALID_AREA_ID',
        message: 'Mã phòng (areaId) không đúng định dạng UUID.',
      });
    }

    try {
      const data = await queueService.getQueueByAreaId(areaId.trim());
      if (!data) {
        return res.status(404).json({
          error: 'AREA_NOT_FOUND',
          message: 'Không tìm thấy thông tin phòng với mã đã cung cấp.',
        });
      }
      return res.json(data);
    } catch (err) {
      return res.status(500).json({
        error: 'DATABASE_ERROR',
        message: err.message,
      });
    }
  });

  router.post('/queue/calling-result', async (req, res) => {
    try {
      const { areaId, patientName, seqNum, patientId } = req.body || {};
      if (!areaId) {
        return res.status(400).json({
          error: 'MISSING_AREA_ID',
          message: 'Vui lòng cung cấp mã hoặc tên phòng (areaId).',
        });
      }

      const resolvedAreaId = await queueService.resolveAreaId(areaId);
      if (!resolvedAreaId) {
        return res.status(404).json({
          error: 'AREA_NOT_FOUND',
          message: `Không tìm thấy phòng tương ứng với mã: ${areaId}`,
        });
      }

      queueService.setResultCalling(resolvedAreaId, { patientName, seqNum, patientId });
      return res.json({
        success: true,
        message: 'Đã ghi nhận gọi trả kết quả thành công',
        areaId: resolvedAreaId,
        patientName,
        seqNum,
      });
    } catch (err) {
      return res.status(500).json({
        error: 'SERVER_ERROR',
        message: err.message,
      });
    }
  });

  router.post('/queue/clear-calling-result', async (req, res) => {
    try {
      const { areaId } = req.body || {};
      if (areaId) {
        const resolvedAreaId = await queueService.resolveAreaId(areaId);
        if (resolvedAreaId) {
          queueService.clearResultCalling(resolvedAreaId);
        }
      }
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({
        error: 'SERVER_ERROR',
        message: err.message,
      });
    }
  });

  return router;
}

module.exports = { createApiRouter };
